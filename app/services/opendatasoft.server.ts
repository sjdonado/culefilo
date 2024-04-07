import { AppLoadContext } from '@remix-run/cloudflare';

type PostalCodeRecord = {
  total_count: number;
  results: Array<{
    country_code: string;
    postal_code: string;
    place_name: string;
    admin_name1: string;
    admin_code1: string;
    admin_name2: string;
    admin_code2: string;
    admin_name3: string;
    admin_code3: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
};

export default async function getLocationDataFromZipCode(
  context: AppLoadContext,
  zipCode: string
) {
  const url = new URL(context.cloudflare.env.OPENDATASOFT_API_URL);

  url.searchParams.append('where', `postal_code="${zipCode}" AND accuracy IS NOT NULL`);
  url.searchParams.append('limit', '1');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `[${getLocationDataFromZipCode.name}] ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json<PostalCodeRecord>();

  if (data.total_count === 0) {
    throw new Error(
      `[${getLocationDataFromZipCode.name}] No results found for ${zipCode}`
    );
  }

  return {
    country: data.results[0].country_code,
    city: data.results[0].place_name,
    state: data.results[0].admin_name1,
    coordinates: {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude,
    },
  };
}
