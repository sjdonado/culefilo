import { useRef, useState, useEffect } from 'react';
import { useControlField } from 'remix-validated-form';

import {
  initializeAutocomplete,
  cleanUpAutocomplete,
} from '~/utils/autocomplete.client';
import { type InputProps, default as Input } from './Input';

interface AutocompletePlacesInput extends InputProps {
  placesApiKey: string;
  onCoordinatesChange:  (coordinates: {
    latitude: number;
    longitude: number;
  }) => void;
}

export default function AutocompletePlacesInput ({
  name,
  label,
  placeholder,
  placesApiKey,
  defaultValue,
  icon,
  disabled,
  onCoordinatesChange,
  ...rest
}: AutocompletePlacesInput) {
  const [zipCode, setZipCode] = useState(defaultValue);
  const [
    isAutocompleteInitialized,
    setIsAutocompleteInitialized,
  ] = useState<boolean>(false);

  const [latitude, setLatitude] =
    useControlField<number | undefined>('latitude', 'searchForm');
  const [longitude, setLongitude] =
    useControlField<number | undefined>('longitude', 'searchForm');

  const zipCodeInputRef = useRef(null);

  const onPlaceChangeHandler = (
    autocomplete: google.maps.places.Autocomplete,
  ) => {
    return () => {
      const place = autocomplete.getPlace();
      const parsedZipCode = place
        ?.address_components
        ?.find((component) => component.types.includes('postal_code'))
        ?.long_name;
      const onlyNumbersRegExp = /^\d+$/;
      if (parsedZipCode && onlyNumbersRegExp.test(parsedZipCode)) {
        const latitude = place?.geometry?.location?.lat();
        const longitude = place?.geometry?.location?.lng();
        if (latitude && longitude) {
          setLatitude(latitude);
          setLongitude(longitude);
          onCoordinatesChange({
            latitude,
            longitude,
          });
          cleanUpAutocomplete(autocomplete);
          setIsAutocompleteInitialized(false);
        }
      }
    };
  }

  useEffect(() => {
    const loadAutocomplete = async() => {
      if (zipCodeInputRef.current) {
        if (!isAutocompleteInitialized) {
          await initializeAutocomplete({
            input: zipCodeInputRef.current,
            onPlaceChangeHandler,
            apiKey: placesApiKey,
          });
          setIsAutocompleteInitialized(true);
        }
      }
    }

    loadAutocomplete();
  });

  return (
    <div>
      <Input
          name={name}
          label={label}
          type="number"
          placeholder="080001"
          icon={icon}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={(e) => setZipCode(e.target.value)}
          value={zipCode}
          forwardedRef={zipCodeInputRef}
        />
        <input
          type="hidden"
          name="latitude"
          value={latitude}
          onChange={(e) => setLatitude(parseFloat(e.target.value))}
        />
        <input
          type="hidden"
          name="longitude"
          value={longitude}
          onChange={(e) => setLongitude(parseFloat(e.target.value))}
        />
    </div>
  );
}
