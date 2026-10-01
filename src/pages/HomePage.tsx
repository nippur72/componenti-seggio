// pagina nuova, non presente nell'originale: nell'app presenze i link con PIN
// venivano generati altrove; qui la home consente di generare il link della
// sezione direttamente (stesso algoritmo sez_to_pin).
import { useState } from "react";
import { Form, FormGroup, Label, Input, Button, Alert } from "reactstrap";
import { Frame } from "../components/Frame";
import { sez_to_pin } from "./pin";

export function HomePage() {
    const [sez, setSez] = useState("");
    const [speciale, setSpeciale] = useState(false);

    const num = parseInt(sez || "0");
    const valido = num >= 1 && num <= 196;
    const pin = valido ? sez_to_pin(`${num}${speciale ? "s" : ""}`) : 0;

    return (
        <Frame>
            <h2>Componenti del Seggio Elettorale</h2>

            <Alert color="info">
                Inserisci il numero della sezione per aprire la scheda di inserimento dei dati
                dei componenti del seggio.
            </Alert>

            <Form>
                <FormGroup row>
                    <Label for="home-sez" sm={3}>Numero sezione</Label>
                    <Label sm={2}>
                        <Input
                            type="number"
                            id="home-sez"
                            value={sez}
                            min={1}
                            max={196}
                            onChange={e => setSez(e.target.value)}
                        />
                    </Label>
                    <Label sm={4} check className="mt-2">
                        <Input
                            type="checkbox"
                            checked={speciale}
                            onChange={e => setSpeciale(e.target.checked)}
                        />{" "}
                        Seggio speciale
                    </Label>
                </FormGroup>

                <div className="mt-3 d-flex gap-2 flex-wrap">
                    {valido &&
                        <Button color="primary" href={`#/elettorale/${pin}`}>
                            Apri sezione {num}{speciale ? "S" : ""}
                        </Button>
                    }
                    <Button color="secondary" href="#/elettorale_status">
                        Stato componenti di seggio
                    </Button>
                </div>
            </Form>
        </Frame>
    );
}
