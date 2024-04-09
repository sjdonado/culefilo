import { APP_VERSION } from '~/config/env';

export default function Footer() {
  return (
    <footer className="flex justify-center gap-1 p-2 text-xs text-gray-500">
      <p>Made with ❤️ by @sjdonado @gjhernandez @krthr</p>
      <span>•</span>
      <p>v{APP_VERSION}</p>
    </footer>
  );
}
