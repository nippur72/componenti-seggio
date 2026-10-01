// versione semplificata di src/tags/CampoInput.tsx dell'app presenze:
// conservati solo i rami string/password/search, gli unici usati dalle pagine
// elettorali (rimossi date/time/number e la navigazione con i cursori).
import { AllHTMLAttributes, useState, useEffect } from "react";

interface Props extends AllHTMLAttributes<{}> {
    onCambiato?: (newvalue: string, oldvalue?: string) => void;
    value: string;
    type: "string" | "password" | "search";
    innerRef?: any;
}

export function CampoInput(props: Props) {

    const [value, setValue] = useState(props.value);
    const [initialValue, setInitialValue] = useState("");

    useEffect(() => {
        setValue(props.value)
    }, [props.value]);

    const {
        className,
        type,
        innerRef,
        onCambiato,
        ...rest
    } = props;

    const classes = className === undefined ? [] : className.split(" ");

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newValue = e.target.value;
        if (newValue !== value) {
            setValue(newValue);
        }
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        setInitialValue(e.target.value);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
        const converted = e.target.value;

        if (converted !== value) {
            setValue(converted);
            e.target.value = converted;
        }

        if (props.onCambiato) {
            if (converted !== initialValue) {
                props.onCambiato(converted, props.value);
            }
        }
    };

    return (
        <input {...rest}
            ref={innerRef}
            className={classes.join(" ")}
            type={type === "password" || type === "search" ? type : "text"}
            onFocus={handleFocus}
            onBlur={handleBlur}
            value={value}
            onChange={handleChange}
            spellCheck={false}
            autoComplete={props.autoComplete ?? "off"}
        />
    );
}
