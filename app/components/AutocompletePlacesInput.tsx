import { useRef, useState, useEffect, useCallback } from 'react';

import { initializeAutocomplete, cleanUpAutocomplete } from '~/utils/autocomplete.client';
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

  const [zipCode, setZipCode] = useState(defaultValue);
  const [coordinates, setCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >();

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>();

  const onSelectPlaceHandler = (latitude: number, longitude: number, zipCode: string) => {
    console.log({ latitude, longitude, zipCode });
    setCoordinates({ latitude, longitude });
    setZipCode(zipCode);
  };

  const loadAutocomplete = useCallback(async () => {
    if (zipCodeInputRef.current && !autocomplete) {
      const autocomplete = await initializeAutocomplete({
        input: zipCodeInputRef.current,
        apiKey: autocompleteApiKey,
        onSelected: (latitude, longitude, zipCode) =>
          onSelectPlaceHandler(latitude, longitude, zipCode),
      });

      setAutocomplete(autocomplete);
    }
  }, [autocomplete, autocompleteApiKey]);

  useEffect(() => {
    loadAutocomplete();

    return () => {
      if (autocomplete) {
        cleanUpAutocomplete(autocomplete);
      }
    };
  });

  return (
    <div>
      <Input
        forwardedRef={zipCodeInputRef}
        name={name}
        label={label}
        type="number"
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
