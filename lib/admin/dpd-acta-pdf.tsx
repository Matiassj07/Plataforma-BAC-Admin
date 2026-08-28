import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const BAC_RED = "#D2122E";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { backgroundColor: BAC_RED, padding: 14, marginBottom: 20, flexDirection: "row", alignItems: "center" },
  logoBox: {
    width: 28,
    height: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: BAC_RED, fontSize: 14, fontWeight: 700 },
  headerTextWrap: { flexDirection: "column" },
  headerTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: 700 },
  headerSubtitle: { color: "#FFFFFF", fontSize: 9, marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottom: "1pt solid #dddddd",
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { fontWeight: 700, width: 90 },
  value: { flex: 1 },
  box: { border: "1pt solid #cccccc", borderRadius: 3, padding: 8, backgroundColor: "#fafafa" },
  firmasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 70 },
  firmaBox: { width: "45%" },
  firmaLinea: { borderTop: "1pt solid #333333", marginBottom: 4 },
  firmaLabel: { fontWeight: 700, marginBottom: 2 },
});

export interface ActaPdfData {
  numeroActa: string;
  fechaCreacion: string;
  empresa: { nombre: string; ruc: string | null; direccion: string | null };
  dpd: { nombre: string; correo: string };
  actividad: { mes: string; fase: string; descripcion: string } | null;
  hallazgo: string;
  recomendacion: string;
}

function ActaPdfDocument({ data }: { data: ActaPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>ACTA DE NO CONFORMIDAD N° {data.numeroActa}</Text>
            <Text style={styles.headerSubtitle}>Fecha: {data.fechaCreacion}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESPONSABLE DEL TRATAMIENTO</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Empresa:</Text>
            <Text style={styles.value}>{data.empresa.nombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RUC:</Text>
            <Text style={styles.value}>{data.empresa.ruc ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{data.empresa.direccion ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELEGADO DE PROTECCIÓN DE DATOS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.dpd.nombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Correo:</Text>
            <Text style={styles.value}>{data.dpd.correo}</Text>
          </View>
        </View>

        {data.actividad && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVIDAD RELACIONADA</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Mes:</Text>
              <Text style={styles.value}>
                {data.actividad.mes} — {data.actividad.fase}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Descripción:</Text>
              <Text style={styles.value}>{data.actividad.descripcion}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HALLAZGO IDENTIFICADO</Text>
          <View style={styles.box}>
            <Text>{data.hallazgo}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMENDACIÓN</Text>
          <View style={styles.box}>
            <Text>{data.recomendacion}</Text>
          </View>
        </View>

        <View style={styles.firmasRow}>
          <View style={styles.firmaBox}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>DPD</Text>
            <Text>{data.dpd.nombre}</Text>
            <Text style={{ marginTop: 10 }}>Fecha: _______________</Text>
          </View>
          <View style={styles.firmaBox}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>Representante de la Empresa</Text>
            <Text>{data.empresa.nombre}</Text>
            <Text style={{ marginTop: 10 }}>Fecha: _______________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generarActaPdfBuffer(data: ActaPdfData): Promise<Buffer> {
  return renderToBuffer(<ActaPdfDocument data={data} />);
}
