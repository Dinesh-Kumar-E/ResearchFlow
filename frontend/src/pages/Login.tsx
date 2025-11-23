import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Lock, Mail, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";
import { ShootingStars } from "../components/ui/shooting-stars";
import { StarsBackground } from "../components/ui/stars-background";
import { TwinklingStars } from "../components/ui/TwinklingStars";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError("Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Shooting Stars Background */}
      {/* <ShootingStars
        minDelay={1200}
        maxDelay={3000}
      /> */}
      <TwinklingStars count={150} />
      <StarsBackground
        starDensity={0.0002}
        className="opacity-50"
      />

      {/* Ambient glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10 bg-surface/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            ResearchFlow
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to access your research workspace
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-white/5 py-3 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-text-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 bg-white/5 py-3 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-text-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-primary to-primary-dark px-3 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <ArrowRight className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                )}
              </span>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Not a member?{" "}
          <Link to="/register" className="font-semibold leading-6 text-primary hover:text-primary-dark transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
