import React from "react";

import { EditProblemModal } from "../screens/library/EditProblemModal";
import { useEditProblemStore } from "../store/editProblemStore";

/** Shared, self-contained edit modal. Drop into any surface — reads all
 *  state from useEditProblemStore; no props required. */
export function EditProblemModalConnected() {
  const editingProblem  = useEditProblemStore(s => s.editingProblem);
  const topicChoices    = useEditProblemStore(s => s.topicChoices);
  const companyChoices  = useEditProblemStore(s => s.companyChoices);
  const close           = useEditProblemStore(s => s.close);

  return (
    <EditProblemModal
      open={editingProblem !== null}
      problem={editingProblem}
      topicChoices={topicChoices}
      companyChoices={companyChoices}
      onClose={close}
    />
  );
}
