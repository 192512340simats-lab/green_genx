/* eslint-disable jsx-a11y/alt-text */
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Registration, TeamMember } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#11120f",
    color: "#f4f1e8",
    fontFamily: "Helvetica",
  },
  ticket: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#49412b",
    padding: 26,
    justifyContent: "space-between",
  },
  header: { alignItems: "center" },
  brandMark: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: "#c5a64b",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { color: "#d4b75f", fontSize: 15, fontWeight: 700 },
  eyebrow: {
    color: "#c5a64b",
    fontSize: 7,
    letterSpacing: 2.4,
    textAlign: "center",
  },
  confirmation: { marginTop: 14 },
  title: {
    marginTop: 9,
    color: "#f4f1e8",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  tagline: { marginTop: 5, color: "#aaa99f", fontSize: 8, textAlign: "center" },
  badge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#414333",
    borderRadius: 14,
    backgroundColor: "#1d211a",
    color: "#c7d0ac",
    fontSize: 7,
    letterSpacing: 1.4,
  },
  divider: { marginVertical: 18, borderBottomWidth: 1, borderBottomColor: "#302f28" },
  teamName: {
    marginTop: 8,
    color: "#f4f1e8",
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
  },
  projectTitle: {
    marginTop: 6,
    color: "#c5a64b",
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: "center",
  },
  infoRow: { flexDirection: "row", marginTop: 17 },
  infoColumn: { width: "48%" },
  secondColumn: { marginLeft: "4%" },
  label: {
    color: "#89877d",
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  value: { marginTop: 6, color: "#f0ede4", fontSize: 10, lineHeight: 1.4 },
  hoursCard: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#49412b",
    borderRadius: 6,
    backgroundColor: "#191b15",
  },
  hoursHeading: {
    color: "#c5a64b",
    fontSize: 7,
    letterSpacing: 1.8,
    textAlign: "center",
  },
  hoursTimeline: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  hoursEndpoint: { width: 76 },
  hoursTime: { color: "#f4f1e8", fontSize: 12, fontWeight: 700 },
  hoursCaption: { marginTop: 3, color: "#89877d", fontSize: 6, letterSpacing: 1.1 },
  hoursTrack: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  hoursDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#d4b75f" },
  hoursLine: { flex: 1, height: 1, backgroundColor: "#8e793e" },
  hoursDuration: { marginTop: 7, color: "#aaa99f", fontSize: 7, textAlign: "center" },
  sectionHeading: {
    marginBottom: 8,
    color: "#c5a64b",
    fontSize: 7,
    letterSpacing: 1.8,
  },
  memberList: { marginTop: 20 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#302f28",
    paddingVertical: 8,
  },
  memberNumber: { width: 28, color: "#8e896f", fontSize: 8 },
  memberName: { flex: 1, color: "#f0ede4", fontSize: 9, lineHeight: 1.3 },
  memberRole: {
    width: 58,
    color: "#c5a64b",
    fontSize: 7,
    letterSpacing: 0.6,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#49412b",
    marginTop: 20,
    paddingTop: 15,
  },
  qr: { width: 68, height: 68 },
  footerDetails: { flex: 1, marginLeft: 16 },
  footerNote: { color: "#aaa99f", fontSize: 8, lineHeight: 1.5 },
  ticketCode: {
    marginTop: 8,
    color: "#d4b75f",
    fontFamily: "Courier",
    fontSize: 9,
    letterSpacing: 0.6,
  },
});

export default function GatePassPage({
  registration,
  members,
  eventDate,
  venue,
  qrDataUrl,
}: {
  registration: Registration;
  members: TeamMember[];
  eventDate: string;
  venue: string;
  qrDataUrl: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.ticket}>
        <View>
          <View style={styles.header}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>G</Text></View>
            <Text style={[styles.eyebrow, styles.confirmation]}>REGISTRATION CONFIRMED</Text>
            <Text style={styles.title}>GREEN GENX</Text>
            <Text style={styles.tagline}>Where Green Ideas Meet Technology</Text>
            <Text style={styles.badge}>APPROVED · TEAM PASS</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.eyebrow}>TEAM</Text>
          <Text style={styles.teamName}>{registration.team_name}</Text>
          <Text style={styles.projectTitle}>{registration.project_title}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Team leader</Text>
              <Text style={styles.value}>{registration.leader_name}</Text>
            </View>
            <View style={[styles.infoColumn, styles.secondColumn]}>
              <Text style={styles.label}>Pass type</Text>
              <Text style={styles.value}>
                {registration.category === "internal" ? "Internal team" : "External team"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{eventDate}</Text>
            </View>
            <View style={[styles.infoColumn, styles.secondColumn]}>
              <Text style={styles.label}>Venue</Text>
              <Text style={styles.value}>{venue}</Text>
            </View>
          </View>

          <View style={styles.hoursCard}>
            <Text style={styles.hoursHeading}>EVENT HOURS · IST</Text>
            <View style={styles.hoursTimeline}>
              <View style={styles.hoursEndpoint}>
                <Text style={styles.hoursTime}>8:00 AM</Text>
                <Text style={styles.hoursCaption}>START</Text>
              </View>
              <View style={styles.hoursTrack}>
                <View style={styles.hoursDot} />
                <View style={styles.hoursLine} />
                <View style={styles.hoursDot} />
              </View>
              <View style={[styles.hoursEndpoint, { alignItems: "flex-end" }]}>
                <Text style={styles.hoursTime}>4:30 PM</Text>
                <Text style={styles.hoursCaption}>END</Text>
              </View>
            </View>
            <Text style={styles.hoursDuration}>8.5 HOURS · FULL-DAY EVENT</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>College</Text>
              <Text style={styles.value}>{registration.college_name}</Text>
            </View>
            <View style={[styles.infoColumn, styles.secondColumn]}>
              <Text style={styles.label}>Department · Year</Text>
              <Text style={styles.value}>
                {registration.department} · Year {registration.year_of_study}
              </Text>
            </View>
          </View>

          <View style={styles.memberList}>
            <Text style={styles.sectionHeading}>ADMISSION · TEAM MEMBERS</Text>
            {members.map((member, index) => (
              <View style={styles.memberRow} key={member.id}>
                <Text style={styles.memberNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <Text style={styles.memberName}>{member.full_name}</Text>
                <Text style={styles.memberRole}>{member.is_leader ? "LEADER" : "MEMBER"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Image style={styles.qr} src={qrDataUrl} />
          <View style={styles.footerDetails}>
            <Text style={styles.label}>Scan to verify at entry</Text>
            <Text style={styles.footerNote}>
              Valid for the approved team listed on this pass. Keep your college ID available at check-in.
            </Text>
            <Text style={styles.ticketCode}>{registration.registration_code}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}
