import { SHARED_PACKAGE_NAME } from "@ai-investment-assistant/shared";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 flex-col items-center justify-center py-32">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          AI Investment Assistant — under construction
        </p>
        <p
          data-testid="shared-package-name"
          className="mt-2 text-xs text-zinc-400 dark:text-zinc-600"
        >
          {SHARED_PACKAGE_NAME}
        </p>
      </main>
    </div>
  );
}
