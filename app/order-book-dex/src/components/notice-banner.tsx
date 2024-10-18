import { OctagonAlertIcon } from "lucide-react";

const displayText =
  "Chrono is currently in its alpha stage, and the data displayed on the website is for demonstration purposes only.";

export function NoticeBanner() {
  return (
    <div className="bg-amber-900 p-2 flex justify-center items-center gap-2">
      <OctagonAlertIcon className="w-4 h-4" />
      <div className="inline-block">{displayText}</div>
      <OctagonAlertIcon className="w-4 h-4" />
    </div>
  );
}
