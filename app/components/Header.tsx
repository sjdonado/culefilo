import { Link } from '@remix-run/react';

export default function Header() {
  return (
    <div className="my-8 flex flex-col justify-center gap-2">
      <Link to="/" className="link">
        <h1 className="text-3xl font-bold">Cule filo</h1>
      </Link>
      <p className="text-gray-500">
        Search for your favorite food near you, quickly and powered by AI
      </p>
    </div>
  );
}
