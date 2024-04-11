import { Loader as GoogleMapsApiLoader } from "@googlemaps/js-api-loader"

export const initializeAutocomplete = async ({
  input,
  onPlaceChangeHandler,
  apiKey,
} : {
  input: HTMLInputElement,
  onPlaceChangeHandler: (
    autocomplete: google.maps.places.Autocomplete,
    ) => Function,
    apiKey: string,
}) => {
  const googleMapsApiLoader = new GoogleMapsApiLoader({
    apiKey,
    version: "weekly",
  });
  const { Autocomplete }  = await googleMapsApiLoader
    .importLibrary('places');
  const options = {
    fields: [
      'formatted_address',
      'geometry',
      'name',
      'address_components'
    ],
    strictBounds: false,
  };
  const autocomplete = new Autocomplete(
    input,
    options,
  );
  const onPlaceChange = onPlaceChangeHandler(autocomplete);
  autocomplete.addListener('place_changed', onPlaceChange);
};

export const cleanUpAutocomplete = (
  autocomplete: google.maps.places.Autocomplete
) => {
  google.maps?.event.clearInstanceListeners(autocomplete);
};
