import type { ReactNode } from "react";
import { Crown } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative flex-col justify-between p-12 text-sidebar-foreground" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">NCAA Academy</div>
            <div className="text-xs opacity-75">academy.ncaaweb.com.ng</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Train. Certify. Officiate.</h2>
          <p className="text-sm opacity-80">
            The official learning platform of the Nigerian Chess Arbiters' Association — courses, examinations, CPD tracking and digital licensing for arbiters at every level.
          </p>
        </div>
        <div className="text-xs opacity-60">© NCAA — All rights reserved</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">NCAA Academy</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}