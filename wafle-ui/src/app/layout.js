import "./globals.css";
import { DemoSessionProvider } from "@/context/demo-session-context";

export const metadata = {
  title: {
    default: "Waflé — Feedback that feels safe",
    template: "%s | Waflé",
  },
  description:
    "A privacy-first employee feedback experience for turning honest input into visible action.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DemoSessionProvider>{children}</DemoSessionProvider>
      </body>
    </html>
  );
}
