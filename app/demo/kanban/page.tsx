import { redirect } from "next/navigation";

/** Legacy previews resolve to the maintained workspace surfaces. */
export default function KanbanDemoPage() {
  redirect("/demo/workspace?page=board");
}
