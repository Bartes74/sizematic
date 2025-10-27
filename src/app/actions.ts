"use server";

import { revalidatePath } from "next/cache";
import { addMeasurement } from "@/server/measurements";
import type { Category, MeasurementValues } from "@/lib/types";

type MeasurementFormState = {
  error?: string;
};

const METRIC_VALUE_REGEX = /^[0-9]+(\.[0-9]{1,2})?$/;

const VALID_CATEGORIES: Category[] = [
  "tops",
  "bottoms",
  "footwear",
  "headwear",
  "accessories",
  "outerwear",
  "kids",
];

export async function createMeasurementAction(
  prevState: MeasurementFormState,
  formData: FormData
): Promise<MeasurementFormState> {
  const category = String(formData.get("category") ?? "").trim();
  const measurementField = String(formData.get("measurementField") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!category || !VALID_CATEGORIES.includes(category as Category)) {
    return { error: "Wybierz poprawną kategorię pomiaru." };
  }

  if (!measurementField) {
    return { error: "Podaj nazwę pomiaru (np. chest, waist, hips)." };
  }

  if (!value || !METRIC_VALUE_REGEX.test(value)) {
    return { error: "Podaj wartość w centymetrach (np. 92 lub 92.5)." };
  }

  const valueCm = Number(value);

  // Build the values object with the measurement
  const values: MeasurementValues = {
    [measurementField]: valueCm,
  };

  try {
    await addMeasurement({
      category: category as Category,
      values,
      notes,
    });

    revalidatePath("/");

    return {};
  } catch (error) {
    console.error(error);
    return { error: "Nie udało się zapisać pomiaru. Spróbuj ponownie." };
  }
}
