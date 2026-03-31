import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import {
  CheckboxGroup,
  RadioButton,
  RadioButtonGroup,
  SearchInput,
  UDS,
} from '@uwn/react-widgets';

import { createProps, type SelectionMode, type SelectionOption } from './createProps';
import type { FilterComponentForwardRefModel, FilterComponentProps } from '../../types';
import s from './index.module.scss';

type Props = FilterComponentProps & {
  mode: SelectionMode;
};

export const SelectionFilter = forwardRef<FilterComponentForwardRefModel, Props>(
  (
    {
      defaultOptions,
      onChange,
      filterLabelFormatter,
      field,
      hideSearchInput,
      defaultSelection,
      mode,
    },
    ref,
  ) => {
    const [options, setOptions] = useState<SelectionOption[]>(
      createProps(defaultOptions, filterLabelFormatter, defaultSelection),
    );
    const [searchInput, setSearchInput] = useState('');

    useImperativeHandle(ref, () => ({
      onSetModel: (selectedIds: string[]) => {
        const normalizedIds = selectedIds.map((id) => id.toLowerCase());

        setOptions((prev) => {
          if (mode === 'single') {
            const selectedId = normalizedIds[0];

            return prev.map((option) => ({
              ...option,
              checked: option.id.toLowerCase() === selectedId,
            }));
          }

          return prev.map((option) => ({
            ...option,
            checked: normalizedIds.includes(option.id.toLowerCase()),
          }));
        });
      },
    }));

    useEffect(() => {
      const selectedValues = options
        .filter((option) => option.checked)
        .map((option) => option.id);

      onChange(selectedValues);
    }, [onChange, options]);

    useEffect(() => {
      return () => setSearchInput('');
    }, []);

    const handleCheckboxChange = useCallback(
      ({ checked, id }: { checked: boolean; id: string }) => {
        setOptions((prev) =>
          prev.map((option) =>
            option.id === id ? { ...option, checked } : option,
          ),
        );
      },
      [],
    );

    const handleRadioChange = useCallback((event: any) => {
      const selectedId = event?.target?.value;

      if (!selectedId) {
        return;
      }

      setOptions((prev) =>
        prev.map((option) => ({
          ...option,
          checked: option.id === selectedId,
        })),
      );
    }, []);

    const handleSearch = useCallback(
      ({ target: { value } }: any) => setSearchInput(value),
      [],
    );

    const filteredOptions = useMemo(() => {
      const normalizedSearch = searchInput.toLowerCase().trim();

      const result = options.filter((option) =>
        option.label.toLowerCase().trim().includes(normalizedSearch),
      );

      if (mode === 'multiple') {
        return [...result].sort((a, b) =>
          a.checked === b.checked ? 0 : a.checked ? -1 : 1,
        );
      }

      return result;
    }, [mode, options, searchInput]);

    const checkboxItems = useMemo(
      () =>
        filteredOptions.map((option) => ({
          id: option.id,
          label: option.label,
          checked: option.checked,
        })),
      [filteredOptions],
    );

    const radioItems = useMemo(
      () =>
        filteredOptions.map((option) => ({
          value: option.id,
          label: option.label,
        })),
      [filteredOptions],
    );

    const selectedValue = useMemo(
      () => options.find((option) => option.checked)?.id ?? '',
      [options],
    );

    return (
      <UDS type={UDS.type.HD} size={UDS.size.SMALL}>
        <div
          data-testid={`main-grid-column-filter--${field}`}
          className={s.wrapper}
        >
          {!hideSearchInput && (
            <div className={s.searchInputWrapper}>
              <SearchInput
                data-testid="main-grid-column-filter--input"
                spaceSaving
                placeholder="Search"
                clearButtonLabel="Clear"
                aria-label="Search"
                name={`search-input-${mode}-filter`}
                value={searchInput}
                onChange={handleSearch}
                autoFocus
                width="auto"
              />
            </div>
          )}

          {mode === 'multiple' ? (
            <div className={s.checkboxFilterList}>
              <CheckboxGroup
                data-testid="column-filter--checkbox-options"
                alignment="vertical"
                checkBoxes={checkboxItems}
                id="checkbox-filter-vertical"
                onChange={handleCheckboxChange}
              />
            </div>
          ) : (
            <div className={s.radioButtonFilterList}>
              <RadioButtonGroup
                name="radiobuttongroup-vertical"
                onChange={handleRadioChange}
                selectedValue={selectedValue || defaultSelection?.[0]}
              >
                {radioItems.map((item) => (
                  <RadioButton {...item} key={item.value} />
                ))}
              </RadioButtonGroup>
            </div>
          )}
        </div>
      </UDS>
    );
  },
);