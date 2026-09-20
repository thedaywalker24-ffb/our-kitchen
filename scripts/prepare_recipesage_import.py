#!/usr/bin/env python3
"""Convert the recipe workbook's Sheet1 into RecipeSage-compatible CSV files."""

from __future__ import annotations

import csv
import re
import sys
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile


XML_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SOURCE_SHEET_NUMBER = 1

OUTPUT_FIELDS = [
    "title",
    "description",
    "yield",
    "active time",
    "total time",
    "ingredients",
    "instructions",
    "url",
    "source",
    "notes",
    "image url",
    "labels",
    "rating",
]

SOURCE_TO_OUTPUT = {
    "Title": "title",
    "Description": "description",
    "Yield": "yield",
    "Active": "active time",
    "Total": "total time",
    "Ingredients": "ingredients",
    "Instructions": "instructions",
    "Original URL": "url",
    "Source": "source",
    "Notes": "notes",
    "Image URL": "image url",
    "Categories": "labels",
    "Rating": "rating",
}


def column_index(cell_reference: str) -> int:
    match = re.match(r"[A-Z]+", cell_reference)
    if not match:
        raise ValueError(f"Invalid cell reference: {cell_reference}")

    result = 0
    for character in match.group():
        result = result * 26 + ord(character) - ord("A") + 1
    return result - 1


def read_shared_strings(archive: ZipFile) -> list[str]:
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iter(XML_NS + "t"))
        for item in root.findall(XML_NS + "si")
    ]


def read_sheet(workbook_path: Path) -> list[list[str]]:
    with ZipFile(workbook_path) as archive:
        shared_strings = read_shared_strings(archive)
        sheet_path = f"xl/worksheets/sheet{SOURCE_SHEET_NUMBER}.xml"
        root = ElementTree.fromstring(archive.read(sheet_path))

    rows: list[list[str]] = []
    for row in root.iter(XML_NS + "row"):
        values: dict[int, str] = {}
        for cell in row.findall(XML_NS + "c"):
            index = column_index(cell.attrib["r"])
            cell_type = cell.attrib.get("t")
            value_node = cell.find(XML_NS + "v")

            if cell_type == "inlineStr":
                inline = cell.find(XML_NS + "is")
                value = (
                    "".join(node.text or "" for node in inline.iter(XML_NS + "t"))
                    if inline is not None
                    else ""
                )
            elif value_node is None:
                value = ""
            elif cell_type == "s":
                value = shared_strings[int(value_node.text or "0")]
            elif cell_type == "b":
                value = "TRUE" if value_node.text == "1" else "FALSE"
            else:
                value = value_node.text or ""

            values[index] = value

        if values:
            materialized = [""] * (max(values) + 1)
            for index, value in values.items():
                materialized[index] = value
            rows.append(materialized)

    return rows


def value_at(row: list[str], index: int | None) -> str:
    if index is None or index >= len(row):
        return ""
    return str(row[index]).strip()


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: prepare_recipesage_import.py WORKBOOK.xlsx OUTPUT_DIRECTORY",
            file=sys.stderr,
        )
        return 2

    workbook_path = Path(sys.argv[1]).resolve()
    output_directory = Path(sys.argv[2]).resolve()
    output_directory.mkdir(parents=True, exist_ok=True)

    rows = read_sheet(workbook_path)
    if not rows:
        raise ValueError("The workbook's first sheet is empty")

    headers = [str(value).strip() for value in rows[0]]
    header_indexes = {header: index for index, header in enumerate(headers) if header}
    missing_headers = sorted(set(SOURCE_TO_OUTPUT) - set(header_indexes))
    if missing_headers:
        raise ValueError(f"Missing expected columns: {', '.join(missing_headers)}")

    recipe_id_index = header_indexes.get("Recipe ID")
    import_rows: list[dict[str, str]] = []
    review_rows: list[dict[str, str]] = []
    title_counts: Counter[str] = Counter()
    missing_ingredients = 0
    missing_instructions = 0

    for source_row in rows[1:]:
        if not any(str(value).strip() for value in source_row):
            continue

        mapped = {
            output: value_at(source_row, header_indexes.get(source))
            for source, output in SOURCE_TO_OUTPUT.items()
        }
        legacy_id = value_at(source_row, recipe_id_index)

        if not mapped["title"]:
            review_rows.append({"legacy id": legacy_id, "reason": "Missing title", **mapped})
            continue

        title_counts[re.sub(r"\s+", " ", mapped["title"].casefold()).strip()] += 1
        missing_ingredients += not bool(mapped["ingredients"])
        missing_instructions += not bool(mapped["instructions"])
        import_rows.append(mapped)

    write_csv(output_directory / "recipesage-import.csv", OUTPUT_FIELDS, import_rows)
    write_csv(
        output_directory / "recipesage-needs-review.csv",
        ["legacy id", "reason", *OUTPUT_FIELDS],
        review_rows,
    )

    duplicate_groups = sum(1 for count in title_counts.values() if count > 1)
    audit_lines = [
        f"Source data rows: {len(import_rows) + len(review_rows)}",
        f"Ready for RecipeSage: {len(import_rows)}",
        f"Needs title review: {len(review_rows)}",
        f"Rows missing ingredients: {missing_ingredients}",
        f"Rows missing instructions: {missing_instructions}",
        f"Duplicate-title groups preserved: {duplicate_groups}",
        "",
        "Do not upload the import more than once unless the prior RecipeSage",
        "import has been rolled back by deleting its automatically-created label.",
    ]
    (output_directory / "migration-audit.txt").write_text(
        "\n".join(audit_lines) + "\n", encoding="utf-8"
    )

    print("\n".join(audit_lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
