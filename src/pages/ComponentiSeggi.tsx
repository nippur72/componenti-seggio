// port di src/pages/elettorale/ComponentiSeggi.tsx dell'app presenze.
// Differenze: percorsi degli import rimappati e accesso dati diretto a Supabase
// (in lib/elettorale.ts) al posto del client RPC.
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Frame } from "../components/Frame";
import { Alert, Card, CardBody, CardHeader, Form, FormGroup, Label, Col, Button } from "reactstrap";
import { CampoInput } from "../tags/CampoInput";
import { Icon } from "../tags/Icon";
import { Spinner } from "../tags/Spinner";
import { getSeggio, putSeggio } from "../lib/elettorale";
import { LoadingButton } from "../tags/LoadingButton";
import { ControllaCF } from "../lib/CodiceFiscale";
import { validaIbanConApi } from "./iban";
import { pin_to_sez } from "./pin";
import { proxy, useSnapshot } from "valtio";
import { capitalizeAll } from "../lib/utils";

// Definisce la struttura dati di un componente, allineata con la tabella SQL e la classe C#
export interface ComponenteDiSeggio {
   Id: number;
   sez: number;
   speciale: boolean;
   ruolo: string;
   nome: string;
   cognome: string;
   codice_fiscale: string;
   IBAN: string;
   telefono: string;
   cf_valido?: boolean;
   iban_valid?: boolean;
   iban_validating?: boolean;
}

class ElettoraleState {
   seggio: ComponenteDiSeggio[] = [];
   originalData: ComponenteDiSeggio[] = [];
   editing_id: number | undefined = undefined;
   showSuccess = false;

   init(data: ComponenteDiSeggio[]) {
      this.seggio = data.map(c => ({
         ...c,
         cf_valido: c.codice_fiscale ? ControllaCF(c.codice_fiscale) : undefined,
         iban_valid: c.IBAN.length === 27 ? true : undefined,
         iban_validating: false
      }));

      this.originalData = JSON.parse(JSON.stringify(this.seggio)); // clona per confronto
   }

   getComponenteById(id: number) {
      return this.seggio.find(c => c.Id === id);
   }

   updateField(id: number, field: keyof ComponenteDiSeggio, value: string) {
      const c = this.getComponenteById(id);
      if (!c) return;

      const upperValue = value.toUpperCase();
      (c as any)[field] = upperValue;

      if (field === 'codice_fiscale') {
         c.cf_valido = upperValue !== '' ? ControllaCF(upperValue) : undefined;
      } else if (field === 'IBAN') {
         c.iban_valid = undefined;
         c.iban_validating = false;
      }
   }

   async validateIban(id: number) {
      const c = this.getComponenteById(id);
      if (!c) return;

      const iban = c.IBAN.toUpperCase();
      if (iban.length === 0) {
         c.iban_valid = undefined;
         c.iban_validating = false;
         return;
      }

      if (iban.length !== 27) {
         c.iban_valid = false;
         c.iban_validating = false;
         return;
      }

      c.iban_validating = true;
      c.iban_valid = await validaIbanConApi(iban);
      c.iban_validating = false;
   }

   isModificato(id: number): boolean {
      const current = this.getComponenteById(id);
      const original = this.originalData.find(c => c.Id === id);
      if (!current || !original) return false;

      return (
         current.nome !== original.nome ||
         current.cognome !== original.cognome ||
         current.codice_fiscale !== original.codice_fiscale ||
         current.IBAN !== original.IBAN ||
         current.telefono !== original.telefono
      );
   }

   isValido(id: number): boolean {
      const c = this.getComponenteById(id);
      if (!c) return false;
      return c.cf_valido !== false && (c.IBAN.length === 0 || c.iban_valid !== false);
   }

   isValidoEModificato(id: number): boolean {
      const c = this.getComponenteById(id);
      if (!c) return false;
      return this.isModificato(id) && this.isValido(id);
   }

   isEmpty(id: number) {
      const c = this.getComponenteById(id);
      if (!c) return false;
      return c.nome.length === 0 &&
         c.cognome.length === 0 &&
         c.codice_fiscale.length === 0 &&
         c.IBAN.length === 0 &&
         c.telefono.length === 0;
   }
}

const state = proxy(new ElettoraleState());

export function ComponentiSeggi() {
   const { pin } = useParams<{ pin: string }>();
   const snap = useSnapshot(state);
   const { sez, speciale } = pin_to_sez(pin);

   const { data, isLoading, error } = useQuery({
      queryKey: ['componenti', sez, speciale],
      queryFn: () => getSeggio(sez, speciale),
      enabled: sez > 0
   });

   // state e' un singleton di modulo condiviso tra le sezioni: quando cambia la
   // sezione va azzerato lo stato transitorio, altrimenti editing_id/showSuccess di
   // un'altra sezione restano attivi e la pagina appare vuota finche' non si ricarica.
   // Deve precedere l'effetto di init, perche' gli effetti girano in ordine.
   useEffect(() => {
      state.editing_id = undefined;
      state.showSuccess = false;
      state.seggio = [];
      state.originalData = [];
   }, [sez, speciale]);

   useEffect(() => {
      if (data) state.init(data);
   }, [data]);

   // I return anticipati devono stare dopo TUTTI gli hook: un pin non valido
   // cambia il numero di hook tra un render e l'altro (React error #300) quando
   // si passa da una sezione valida a una non valida senza ricaricare la pagina.
   if (sez === 0) {
      return <Frame><Alert color="danger">Sezione non valida.</Alert></Frame>;
   }

   if (isLoading) return <Frame><Spinner>Caricamento...</Spinner></Frame>;
   if (error) return <Frame><Alert color="danger">Errore: {error.message}</Alert></Frame>;

   if (snap.showSuccess) {
      return (
         <Frame>
            <Alert color="success" toggle={() => state.showSuccess = false}>
               <h4><Icon icon="check-circle" className="me-2" /> Dati inviati con successo!</h4>
               <div>
                  Grazie per la collaborazione.
               </div>
            </Alert>
         </Frame>
      );
   }

   return (
      <Frame>
         <h2 className="center">Sezione N. {sez}{speciale ? ' Speciale' : ''}</h2>

         {snap.editing_id === undefined ? snap.seggio.map(c =>
            <Card key={c.Id} className="mb-3 shadow-sm">
               <HeaderSeggio componente={c}></HeaderSeggio>
               <CardBody>
                  <ShowComponente componente={c} />
                  <div className="d-flex justify-content-end mt-3">
                     <Button color="secondary" size="lg" onClick={() => state.editing_id = c.Id}>
                        <Icon icon="edit" /> {snap.isEmpty(c.Id) ? 'Inserisci dati' : 'Modifica dati'}
                     </Button>
                  </div>
               </CardBody>
            </Card>) : null
         }

         {snap.editing_id !== undefined ? snap.seggio.map(c =>
            snap.editing_id === c.Id ?
               <Card key={c.Id} className="mb-3 shadow-sm">
                  <HeaderSeggio componente={c}></HeaderSeggio>
                  <CardBody>
                     <FormComponente componente={c} />
                  </CardBody>
               </Card> : null
         ) : null}

      </Frame>
   );
}

function PulsanteSalva({ componente }: { componente: ComponenteDiSeggio }) {
   const { pin } = useParams<{ pin: string }>();
   const { sez, speciale } = pin_to_sez(pin);
   const queryClient = useQueryClient();

   // Utilizziamo lo snapshot per la reattivita' dell'interfaccia
   const snap = useSnapshot(state);

   const saveMutation = useMutation({
      mutationFn: (c: ComponenteDiSeggio) => {
         const { cf_valido, iban_valid, iban_validating, ...compToSave } = c;
         return putSeggio([compToSave]);
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['componenti', sez, speciale] });
         queryClient.invalidateQueries({ queryKey: ['componenti', 'all'] });
         state.editing_id = undefined;
         state.showSuccess = true;
         // Nasconde l'alert automaticamente dopo 10 secondi
         setTimeout(() => { state.showSuccess = false; }, 10000);
      }
   });

   return (
      <div className="d-flex justify-content-end mt-3 align-items-center gap-2">
         <Button color="link" onClick={() => state.editing_id = undefined}>
            Annulla
         </Button>
         <LoadingButton
            color="primary"
            size="lg"
            onClick={() => saveMutation.mutate(componente)}
            disabled={!snap.isValidoEModificato(componente.Id) || saveMutation.isPending}
            loading={saveMutation.isPending}>
            <Icon icon="paper-plane"></Icon> Invia dati
         </LoadingButton>
      </div>
   );
}

function FormComponente({ componente }: { componente: ComponenteDiSeggio }) {
   const c = componente;

   const cfClass = c.cf_valido === true ? 'is-valid' : c.cf_valido === false ? 'is-invalid' : '';
   const ibanClass = c.iban_valid === true ? 'is-valid' : c.iban_valid === false ? 'is-invalid' : '';

   return (
      <Form autoComplete="off">
         <FormGroup row>
            <Label for={`f-${c.Id}-1`} sm={3}>Cognome</Label>
            <Col sm={9}>
               <CampoInput
                  type="string"
                  id={`f-${c.Id}-1`}
                  value={c.cognome}
                  onCambiato={v => state.updateField(c.Id, 'cognome', v)}
                  style={{ textTransform: 'uppercase' }}
                  maxLength={27}
                  className={`form-control`}
                  autoComplete="new-password"
                  data-focusable
               />
            </Col>
         </FormGroup>
         <FormGroup row>
            <Label for={`f-${c.Id}-2`} sm={3}>Nome</Label>
            <Col sm={9}>
               <CampoInput
                  type="string"
                  id={`f-${c.Id}-2`}
                  value={c.nome}
                  onCambiato={v => state.updateField(c.Id, 'nome', v)}
                  style={{ textTransform: 'uppercase' }}
                  maxLength={27}
                  className={`form-control`}
                  autoComplete="new-password"
                  data-focusable
               />
            </Col>
         </FormGroup>
         <FormGroup row>
            <Label for={`f-${c.Id}-3`} sm={3}>Codice Fiscale</Label>
            <Col sm={9}>
               <CampoInput
                  type="string"
                  id={`f-${c.Id}-3`}
                  value={c.codice_fiscale}
                  onCambiato={v => state.updateField(c.Id, 'codice_fiscale', v)}
                  style={{ textTransform: 'uppercase' }}
                  className={`form-control font-monospace fs-5 ${cfClass}`}
                  maxLength={16}
                  autoComplete="new-password"
                  data-focusable
               />
            </Col>
         </FormGroup>
         <FormGroup row>
            <Label for={`f-${c.Id}-4`} sm={3}>IBAN</Label>
            <Col sm={9}>
               <CampoInput
                  type="string"
                  id={`f-${c.Id}-4`}
                  value={c.IBAN}
                  onCambiato={v => {
                     state.updateField(c.Id, 'IBAN', v);
                     state.validateIban(c.Id);
                  }}
                  style={{ textTransform: 'uppercase' }}
                  className={`form-control font-monospace fs-5 ${ibanClass}`}
                  maxLength={27}
                  autoComplete="new-password"
                  data-focusable
               />
               {c.iban_validating && <Spinner>Validazione IBAN...</Spinner>}
               {c.IBAN.length === 27 && c.iban_valid &&
                  <small className="form-text text-muted">
                     Il conto corrente deve essere intestato a {c.cognome} {c.nome}<br />
                  </small>
               }
               {c.IBAN.length === 0 &&
                  <small className="form-text text-muted">
                     Se il codice IBAN non e' indicato, il pagamento avverra' tramite riscossione allo sportello bancario
                  </small>
               }
            </Col>
         </FormGroup>
         <FormGroup row>
            <Label for={`f-${c.Id}-5`} sm={3}>Telefono</Label>
            <Col sm={9}>
               <CampoInput
                  type="string"
                  id={`f-${c.Id}-5`}
                  value={c.telefono || ''}
                  onCambiato={v => state.updateField(c.Id, 'telefono', v)}
                  style={{ textTransform: 'uppercase' }}
                  maxLength={20}
                  className={`form-control`}
                  autoComplete="new-password"
                  data-focusable
               />
            </Col>
         </FormGroup>
         <PulsanteSalva
            componente={c}
            data-focusable
         />
      </Form>
   );
}

function HeaderSeggio({ componente }: { componente: ComponenteDiSeggio }) {
   const c = componente;
   return (
      <CardHeader>
         <b>{c.ruolo === 'P' ? 'Presidente' : c.ruolo === 'S' ? 'Scrutatore' : 'Segretario'}</b>
      </CardHeader>
   );
}

export function ShowComponente({ componente }: { componente: ComponenteDiSeggio }) {
   const c = componente;
   return (
      <div className="form-horizontal fs-5">
         <div className="fw-bold mb-2">{c.cognome} {capitalizeAll(c.nome)}</div>
         <div className="mb-1">
            <span className="text-muted small">Cod. Fisc.: </span>
            <span className="">{c.codice_fiscale}</span>
         </div>
         <div className="mb-1">
            <span className="text-muted small">IBAN: </span>
            <span className="fs-5">
               {(!c.IBAN && c.codice_fiscale) ? <small className="text-muted">Non indicato (riscossione allo sportello)</small> : c.IBAN}
            </span>
         </div>
         <div className="">
            <span className="text-muted small">Telefono: </span>
            <span className="">{c.telefono}</span>
         </div>
      </div>
   );
}
