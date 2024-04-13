import { useRef, useState, useEffect, useCallback } from 'react';

import { Loader as GoogleMapsApiLoader } from '@googlemaps/js-api-loader';

import { type InputProps, default as Input } from './Input';
import type { Search } from '~/schemas/search';

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
  const AddressInputRef = useRef(null);

  const [isAutocompleteInitialized, setIsAutocompleteInitialized] = useState(false);

  const [coordinates, setCoordinates] = useState<Search['coordinates']>();

  const initializeAutocomplete = useCallback(async () => {
    if (!AddressInputRef.current || isAutocompleteInitialized) {
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

    const autocomplete = new Autocomplete(AddressInputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      const Address = place?.address_components?.find(component =>
        component.types.includes('postal_code')
      )?.long_name;

      const parsedZipCode = Address?.match(/\d+/)?.[0];
      const latitude = place?.geometry?.location?.lat();
      const longitude = place?.geometry?.location?.lng();

      if (parsedZipCode && latitude && longitude) {
        setCoordinates({ latitude, longitude });
        google.maps?.event.clearInstanceListeners(autocomplete);
      }
    });

    setIsAutocompleteInitialized(true);
  }, [AddressInputRef, isAutocompleteInitialized, autocompleteApiKey]);

  useEffect(() => {
    initializeAutocomplete();
  });

  return (
    <div>
      <Input
        forwardedRef={AddressInputRef}
        name={name}
        label={label}
        type="text"
        placeholder={placeholder}
        icon={icon}
        defaultValue={defaultValue}
        disabled={disabled}
      />
      <input type="hidden" name="coordinates" value={JSON.stringify(coordinates)} />
    </div>
  );
}
