import { Link } from '@remix-run/react';

export default function Header() {
  return (
    <div className="my-4 flex flex-col justify-center gap-2">
      <Link to="/" className="link my-2">
        <h1 className="text-3xl font-bold">Cule filo</h1>
      </Link>
      <p className="text-justify text-gray-500">
        Craving your favorite meal? Our AI-powered search makes it easy to find the top 3
        restaurants serving it near you. Just enter the dish you're looking for and your
        location, and let our intelligent algorithm do the rest. Whether it's a local
        specialty or a global delicacy, our free app will guide you to the perfect spot.
      </p>
    </div>
  );
}
