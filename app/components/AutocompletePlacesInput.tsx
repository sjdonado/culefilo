import { useRef, useState, useEffect, useCallback } from 'react';

import { Loader as GoogleMapsApiLoader } from '@googlemaps/js-api-loader';

import { type InputProps, default as Input } from './Input';
import type { Search } from '~/schemas/search';
import { useField } from 'remix-validated-form';

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
  const { error, getInputProps } = useField('coordinates');

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

      const latitude = place?.geometry?.location?.lat();
      const longitude = place?.geometry?.location?.lng();

      if (latitude && longitude) {
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
    <div className="flex flex-col">
      <Input
        className="!mb-0"
        forwardedRef={AddressInputRef}
        name={name}
        label={label}
        type="text"
        placeholder={placeholder}
        icon={icon}
        defaultValue={defaultValue}
        disabled={disabled}
      />
      <input
        type="hidden"
        name="coordinates"
        {...getInputProps({ value: JSON.stringify(coordinates) })}
      />
      {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
    </div>
  );
}
