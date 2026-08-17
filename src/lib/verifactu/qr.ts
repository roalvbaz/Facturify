import { _isoDate } from "zod/v4/core";

export interface parameterosSinCodificar{
    emisorNif: string;
    numeroFactura: string;
    totalCentimos: number;
    fechaExpedicion:string;
}


export function construirUrlQr(params: parameterosSinCodificar){
    const {emisorNif, numeroFactura,totalCentimos,fechaExpedicion} = params;
    
    const cleanNif = emisorNif.trim().toUpperCase();
    const cleanNumber = numeroFactura.trim();
    const isoDate = fechaExpedicion.includes('T') 
    ? fechaExpedicion.split('T')[0]
    : fechaExpedicion.trim();

    const [year,month,day] = isoDate.split('-');
    const cleanDate = `${day}-${month}-${year}`;

    const cleanCents = (totalCentimos / 100).toFixed(2);
    
    const queryParams= new URLSearchParams({
        nif: cleanNif,
        numserie: cleanNumber,
        fecha: cleanDate,
        importe: cleanCents,
    });
    const baseURL = 'https://sede.agenciatributaria.gob.es/soporte/verifactu'
    return  `${baseURL}?${queryParams.toString()}`;
}