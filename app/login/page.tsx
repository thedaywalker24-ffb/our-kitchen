import { ListChecks, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-brand">
          <span className="brand-mark"><ListChecks /></span>
          <span><strong>Our Kitchen</strong><small>Family recipe book</small></span>
        </div>
        <div className="login-heading">
          <span className="login-lock"><LockKeyhole /></span>
          <div>
            <p className="eyebrow">Private household</p>
            <h1 id="login-heading">Welcome back</h1>
          </div>
        </div>
        <form className="login-form" action={signIn}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error === "missing" ? "Enter both your email and password." : "That email or password was not recognized."}
            </p>
          )}
          <button className="primary-button full-width" type="submit">Sign in</button>
        </form>
        <p className="login-note">Accounts are created by the household owner.</p>
      </section>
    </main>
  );
}
