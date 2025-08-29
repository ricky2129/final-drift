declare module "*.svg" {
  import React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_TRACE_ASSIST_URL: string;
  readonly VITE_TOIL_ASSIST_URL: string;
  readonly VITE_DASHBOARD_ASSIST_URL: string;
  readonly VITE_DRIFT_ASSIST_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
