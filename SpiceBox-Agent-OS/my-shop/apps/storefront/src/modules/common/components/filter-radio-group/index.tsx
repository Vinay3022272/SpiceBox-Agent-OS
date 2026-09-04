"use client"

import { Label, RadioGroup, Text, clx } from "@modules/common/components/ui"

type FilterRadioGroupProps = {
  title: string
  items: {
    value: string
    label: string
  }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

const FilterRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: FilterRadioGroupProps) => {
  return (
    <div className="flex flex-col gap-3 bg-neutral-50/90 p-4 rounded-xl border border-neutral-200/70 shadow-2xs">
      <Text className="text-xs font-bold uppercase tracking-wider text-neutral-800 pb-1.5 border-b border-neutral-200">
        {title}
      </Text>
      <RadioGroup data-testid={dataTestId} className="flex flex-col gap-1.5 pt-1">
        {items?.map((i) => {
          const isSelected = i.value === value
          return (
            <div
              key={i.value}
              onClick={() => handleChange(i.value)}
              className={clx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                {
                  "bg-neutral-900 text-white shadow-xs": isSelected,
                  "text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-900": !isSelected,
                }
              )}
            >
              <div
                className={clx(
                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                  {
                    "border-white bg-white": isSelected,
                    "border-neutral-400 bg-white": !isSelected,
                  }
                )}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
              </div>
              <RadioGroup.Item
                checked={isSelected}
                onChange={() => handleChange(i.value)}
                className="hidden"
                id={i.value}
                value={i.value}
              />
              <Label
                htmlFor={i.value}
                className="cursor-pointer select-none text-xs"
                data-testid="radio-label"
                data-active={isSelected}
              >
                {i.label}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

export default FilterRadioGroup
