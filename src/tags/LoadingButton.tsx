// copia di src/tags/LoadingButton.tsx dell'app presenze
// extends <Button> with "loading" prop

import React from "react";
import { Button as RsButton } from "reactstrap";

interface ReactstrapButtonAttributes extends React.HTMLAttributes<{}>
{
   color?: "primary" | "secondary" | "link" | "danger" | "success";
   size?: any;
   block?: boolean;
   disabled?: boolean;
   type?: "button";
   href?: string;
}

interface LoadingButtonProps extends ReactstrapButtonAttributes
{
   loading: boolean;
}

export const LoadingButton = ({ children, loading, disabled, ...rest }: LoadingButtonProps) =>
{
   return (
      <RsButton disabled={disabled || loading} {...rest}>
         {loading ? <span><i className="fa fa-spinner fa-pulse fa-fw"></i><span> </span></span> : null}
         {children}
      </RsButton>
   );
};
