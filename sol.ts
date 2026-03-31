export const InColumnFilterComponent = forwardRef
  FilterComponentForwardRefModel,
  FilterComponentProps
>(
  (
    AAA,
    ref,
  ) => {
    // Shared state
    const [searchInput, setSearchInput] = useState<string>('');

    // Checkbox mode state
    const [options, setOptions] = useState<CheckboxesProps[]>(
      createCheckboxesProps(defaultOptions, filterLabelFormatter, defaultSelection),
    );

    // Radio mode state
    const [selectedValue, setSelectedValue] = useState<string>();

    // --- Imperative handle ---
    useImperativeHandle(ref, () => ({
      onSetModel: (selectedIds: string[]) => {
        if (mode === 'radio') {
          setSelectedValue(selectedIds?.[0]);
        } else {
          const normalizedIds = selectedIds.map(id => id.toLowerCase());
          setOptions(prev =>
            prev.map(value => ({
              ...value,
              checked: normalizedIds.includes(value.id.toLowerCase()),
            })),
          );
        }
      },
    }));

    // --- onChange effect ---
    useEffect(() => {
      if (mode === 'radio') {
        if (selectedValue) {
          onChange([selectedValue]);
        }
      } else {
        onChange(
          options.reduce<string[]>(
            (acc, value) => (value.checked ? [...acc, value.id] : acc),
            [],
          ),
        );
      }
    }, [onChange, mode === 'radio' ? selectedValue : options]);

    // Reset search on mount
    useEffect(() => {
      return () => setSearchInput('');
    }, []);

    // --- Handlers ---
    const handleChange = useCallback(
      mode === 'radio'
        ? (event: any) => {
            if (event.target?.value) {
              setSelectedValue(event.target.value);
            }
          }
        : ({ checked, id }: { checked: boolean; id: string; label: string }) => {
            setOptions(prev =>
              prev.map(p => (p.id === id ? { ...p, checked } : p)),
            );
          },
      [],
    );

    const handleSearch = useCallback(
      ({ target: { value } }: any) => setSearchInput(value),
      [],
    );

    // --- Filtered items ---
    const filteredItems = useMemo(() => {
      if (mode === 'radio') {
        return options.filter(
          value =>
            value.label &&
            typeof value.label === 'string' &&
            value.label.toLowerCase().trim().includes(searchInput.toLowerCase().trim()),
        );
      }
      return options.filter(value =>
        value.id.toLowerCase().trim().includes(searchInput.toLowerCase().trim()),
      );
    }, [searchInput, options, mode]);

    // --- Render ---
    return (
      <UDS type={UDS.type.HD} size={UDS.size.SMALL}>
        <div
          data-testid={`main-grid--column-filter--${field}`}
          className={s.wrapper}
        >
          {!hideSearchInput && (
            <div className={s.searchInputWrapper}>
              <SearchInput
                data-testid="main-grid--column-filter--input"
                spaceSaving
                placeholder="Search"
                clearButtonLabel="Clear"
                aria-label="Search"
                name="search-input-radiobutton-filter"
                value={searchInput}
                onChange={handleSearch}
                autoFocus
                width="auto"
              />
            </div>
          )}
          <div className={mode === 'radio' ? s.radiobuttonFilterList : s.checkboxFilterList}>
            {mode === 'radio' ? (
              <RadioButtonGroup
                name="radiobuttongroup-vertical"
                onChange={handleChange}
                selectedValue={selectedValue || defaultSelection?.[0]}
              >
                {filteredItems.map(item => (
                  <RadioButton {...item} key={item.value} />
                ))}
              </RadioButtonGroup>
            ) : (
              <CheckboxGroup
                data-testid="column-filter--checkbox-options"
                alignment="vertical"
                checkBoxes={filteredItems}
                id="checkbox-filter-vertical"
                onChange={handleChange}
              />
            )}
          </div>
        </div>
      </UDS>
    );
  },
);