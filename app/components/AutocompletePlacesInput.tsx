import { useRef, useState, useEffect, useCallback } from 'react';

import { Loader as GoogleMapsApiLoader } from '@googlemaps/js-api-loader';

import { type InputProps, default as Input } from './Input';

interface AutocompletePlacesInput extends InputProps {
  autocompleteApiKey: string;
}

export default function AutocompletePlacesInput({
  name,
  label,
  placeholder,
  autocompleteApiKey,
  defaultValue,
  icon,
  disabled,
}: AutocompletePlacesInput) {
  const zipCodeInputRef = useRef(null);

  const [isAutocompleteInitialized, setIsAutocompleteInitialized] = useState(false);

  const [zipCode, setZipCode] = useState(defaultValue);
  const [coordinates, setCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >();

  const initializeAutocomplete = useCallback(async () => {
    if (!zipCodeInputRef.current || isAutocompleteInitialized) {
      return;
    }

    const googleMapsApiLoader = new GoogleMapsApiLoader({
      apiKey: autocompleteApiKey,
      version: 'weekly',
    });

    const { Autocomplete } = await googleMapsApiLoader.importLibrary('places');

    const options = {
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      strictBounds: false,
    };

    const autocomplete = new Autocomplete(zipCodeInputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      console.log('place', place);

      // const zipCode = place?.address_components?.find(component =>
      //   component.types.includes('postal_code')
      // )?.long_name;
      //
      // const parsedZipCode = zipCode?.match(/^\d+$/)?.[0];

      // if (parsedZipCode) {
      const latitude = place?.geometry?.location?.lat();
      const longitude = place?.geometry?.location?.lng();

      console.log({ latitude, longitude });

      if (latitude && longitude) {
        setCoordinates({ latitude, longitude });
        // setZipCode(parsedZipCode);

        google.maps?.event.clearInstanceListeners(autocomplete);
      }
      // }
    });

    setIsAutocompleteInitialized(true);
  }, [zipCodeInputRef, isAutocompleteInitialized, autocompleteApiKey]);

  useEffect(() => {
    initializeAutocomplete();
  });

  return (
    <div>
      <Input
        forwardedRef={zipCodeInputRef}
        name={name}
        label={label}
        type="text"
        placeholder={placeholder}
        icon={icon}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={e => setZipCode(e.target.value)}
        value={zipCode}
      />
      <input type="hidden" name="latitude" value={coordinates?.latitude} />
      <input type="hidden" name="longitude" value={coordinates?.longitude} />
    </div>
  );
}
