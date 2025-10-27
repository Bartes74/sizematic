"use server";

import { revalidatePath } from "next/cache";
import { addMeasurement } from "@/server/measurements";

type MeasurementFormState = {
  error?: string;
};

const METRIC_VALUE_REGEX = /^[0-9]+(\.[0-9]{1,2})?$/;

export async function createMeasurementAction(
  prevState: MeasurementFormState,
  formData: FormData
): Promise<MeasurementFormState> {
  const category = String(formData.get("category") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!category) {
    return { error: "Wybierz kategorię pomiaru." };
  }

  if (!label) {
    return { error: "Podaj nazwę pomiaru." };
  }

  if (!value || !METRIC_VALUE_REGEX.test(value)) {
    return { error: "Podaj wartość w centymetrach (np. 92 lub 92.5)." };
  }

  const valueCm = Number(value);

  try {
    await addMeasurement({
      category,
      label,
      value_cm: valueCm,
      notes
    });

    revalidatePath("/");

    return {};
  } catch (error) {
    console.error(error);
    return { error: "Nie udało się zapisać pomiaru. Spróbuj ponownie." };
  }
}
