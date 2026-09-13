declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
  }
  const QRCode: {
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  };
  export default QRCode;
}