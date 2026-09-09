"use client";

import ModalDialog from "@/components/ModalDialog";
import type { Plant } from "@/types/plant";

interface Props {
  plant: Plant;
  onConfirm: () => void;
  onCancel: () => void;
}

/** The delete-specific wording on top of the shared modal. */
export default function ConfirmDeleteDialog({
  plant,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalDialog
      title="Delete this plant?"
      actions={[{ label: "Delete", tone: "danger", onClick: onConfirm }]}
      onCancel={onCancel}
    >
      {plant.name} and its care dates will be removed. This can&apos;t be
      undone.
    </ModalDialog>
  );
}
