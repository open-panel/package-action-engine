import type { ActionDefinition } from "../types.js";
import { hotkeyAction, hotkeySwitchAction } from "./hotkey.js";
import { openAppAction } from "./open-app.js";
import { openUrlAction } from "./open-url.js";
import { shellAction } from "./shell.js";
import { typeTextAction } from "./type-text.js";
import { changePageAction } from "./change-page.js";
import { closeAction, multimediaAction, openAction, SYSTEM_CATEGORY } from "./system.js";
import {
  backFolderAction,
  nextPageAction,
  openFolderAction,
  pageIndicatorAction,
  previousPageAction,
  switchProfileAction,
  PAGINATION_CATEGORY,
} from "./pagination.js";

export {
  hotkeyAction,
  hotkeySwitchAction,
  openAppAction,
  openUrlAction,
  shellAction,
  typeTextAction,
  changePageAction,
  nextPageAction,
  previousPageAction,
  pageIndicatorAction,
  switchProfileAction,
  openFolderAction,
  backFolderAction,
  openAction,
  closeAction,
  multimediaAction,
  PAGINATION_CATEGORY,
  SYSTEM_CATEGORY,
};

// `any`: a heterogeneous array of definitions with unrelated config types —
// see the comment on ActionRegistry (specs.md Rule 4).
/**
 * The MVP built-in action set (specs.md #3 "Built-in actions"), plus page/profile
 * navigation. The order is the order the desktop's action list renders within a
 * category, so the System group reads the way its actions are grouped on a deck.
 */
export const builtInActions: ActionDefinition<any>[] = [
  // System
  openUrlAction,
  hotkeyAction,
  hotkeySwitchAction,
  openAction,
  openAppAction,
  closeAction,
  typeTextAction,
  multimediaAction,
  // Built-in
  shellAction,
  // Pagination
  changePageAction,
  nextPageAction,
  previousPageAction,
  pageIndicatorAction,
  switchProfileAction,
  openFolderAction,
  backFolderAction,
];
