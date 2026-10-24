import { redirect } from "next/navigation";

/** Legacy previews resolve to the maintained workspace surfaces. */
export default function OperationsDemoPage() {
  redirect("/demo/workspace?page=organization");
}
