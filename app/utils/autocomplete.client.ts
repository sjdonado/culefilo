import { Loader as GoogleMapsApiLoader } from '@googlemaps/js-api-loader';

export const initializeAutocomplete = async ({
  input,
  apiKey,
  onSelected,
}: {
  input: HTMLInputElement;
  apiKey: string;
  onSelected: (latitude: number, longitude: number, zipCode: string) => void;
}) => {
  const googleMapsApiLoader = new GoogleMapsApiLoader({
    apiKey,
    version: 'weekly',
  });

  const { Autocomplete } = await googleMapsApiLoader.importLibrary('places');

  const options = {
    fields: ['formatted_address', 'geometry', 'name', 'address_components'],
    strictBounds: false,
  };

  const autocomplete = new Autocomplete(input, options);

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();

    console.log('place', place);

    const zipCode = place?.address_components?.find(component =>
      component.types.includes('postal_code')
    )?.long_name;

    const parsedZipCode = zipCode?.match(/^\d+$/)?.[0];

    if (parsedZipCode) {
      const latitude = place?.geometry?.location?.lat();
      const longitude = place?.geometry?.location?.lng();

      console.log({ latitude, longitude, parsedZipCode });

      if (latitude && longitude) {
        onSelected(latitude, longitude, parsedZipCode);
        cleanUpAutocomplete(autocomplete);
      }
    }
  });

  return autocomplete;
};

export const cleanUpAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
  google.maps?.event.clearInstanceListeners(autocomplete);
};
