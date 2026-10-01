import { css } from "@emotion/css";
import { ReactNode } from "react";

// copia fedele di src/pages/Frame.tsx dell'app presenze
const frameStyle = css({
   '@media all': {
      margin: "0.25em"
   },
   '@media all and (min-width: 500px)': {
      marginLeft: "1em",
      marginRight: "1em",
      marginTop: "0.5em",
      marginBottom: "0.5em"
   },
   '@media all and (min-width: 700px)': {
      marginLeft: "2em",
      marginRight: "2em",
      marginTop: "1em",
      marginBottom: "1em"
   }
});

export function Frame({ children }: { children?: ReactNode }) {
   return <div className={frameStyle}>
      {children}
   </div>
}
