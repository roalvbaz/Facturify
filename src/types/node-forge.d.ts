/**
 * Declaraciones mínimas de `node-forge` para el módulo Veri*factu.
 * Cubre solo el API que se usa en certificate.ts, soap/client.ts y los tests
 * (PKCS12 + X509 + ASN.1).
 */
declare module 'node-forge' {
  namespace pki {
    interface Attribute {
      name: string;
      value: string | null;
    }

    interface Subject {
      attributes: Attribute[];
      getField(name: string): { value: string } | null;
      commonName?: string;
    }

    interface Validity {
      notBefore: Date;
      notAfter: Date;
    }

    interface Cert {
      subject: Subject;
      issuer: Subject;
      serialNumber: string;
      publicKey: any;
      validity: Validity;
      setSubject(attrs: Attribute[]): void;
      setIssuer(attrs: Attribute[]): void;
      sign(key: any, md: any): void;
    }

    interface PrivateKey {
      publicKey?: any;
    }

    interface Bag {
      cert?: Cert;
      key?: PrivateKey;
    }

    interface Bags {
      [key: string]: Bag[];
    }

    interface PKCS12 {
      getBags(options?: { bagType: string }): Bags;
    }

    function certificateToPem(cert: Cert): string;
    function privateKeyToPem(key: PrivateKey): string;

    // Sólo usados en tests (generar un PFX self-signed)
    function createCertificate(): Cert;
    function setRsaPublicKey(n: any, e: any): any;

    namespace rsa {
      function generateKeyPair(bits?: number): { privateKey: any; publicKey: any };
    }

    const oids: {
      pkcs8ShroudedKeyBag: string;
      keyBag: string;
      certBag: string;
    };
  }

  namespace pkcs12 {
    function pkcs12FromAsn1(obj: any, password: string): pki.PKCS12;
    function toPkcs12Asn1(key: any, cert: pki.Cert, password: string, options?: any): any;
  }

  namespace asn1 {
    function fromDer(bytes: util.Buffer, options?: any): any;
    function toDer(obj: any): util.Buffer;
  }

  namespace md {
    namespace sha256 {
      function create(): any;
    }
  }

  namespace util {
    interface Buffer {
      length: number;
      bytes(): string;
      getBytes(): string;
      toHex(): string;
    }
    function createBuffer(data: string): Buffer;
    function encode64(data: string): string;
  }
}