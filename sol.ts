export type SelectionMode = 'single' | 'multiple';

export type SelectionOption = {
  id: string;
  label: string;
  checked: boolean;
};

export const createProps = (
  options: readonly string[],
  labelFormatter?: (value: string) => string,
  defaultSelection?: string[],
): SelectionOption[] =>
  options.map((option) => ({
    id: option,
    label: labelFormatter?.(option) ?? option,
    checked: defaultSelection?.includes(option) ?? false,
  }));