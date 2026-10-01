// copia di src/tags/Spinner.tsx dell'app presenze
import React from "react";
import { Spinner as SpinnerReactStrap } from "reactstrap";

interface Props {
   children?: React.ReactNode
}

export function Spinner(props: Props) {
   return (
      <div style={{ textAlign: 'center' }}>
         <SpinnerReactStrap animation="border" color="primary" />
         <div>{props.children}</div>
      </div>
   );
}
