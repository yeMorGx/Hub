import { redirect } from "next/navigation";

/** Legacy previews resolve to the maintained workspace surfaces. */
export default function DemoPage() {
  redirect("/demo/dashboard");
}
