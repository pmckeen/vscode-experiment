function fixTSV() {
	const input = document.getElementById("input").value.trim();

	// Split into rows by line breaks
	const rows = input.split('\n');

	// Handle each row
	const correctedRows = rows.map(row => {
		// Split the row into columns using a regular expression:
		// - Match the first word (Time Span) and everything after until first tab or end of line
		// - Split the rest of the row by single spaces
		const match = row.match(/^(\S+ \S+)(.*)$/);

		if (!match) return row; // If no match, return row as is

		const firstCell = match[1];  // Extract first cell (e.g., "ALL TIME")
		const remainingData = match[2].trim().replace(/ +/g, '\t'); // Replace spaces with tabs

		return `${firstCell}\t${remainingData}`;
	});
	correctedRows[0] = "Time Span	Agent Name	Agent Faction	Date (yyyy-mm-dd)	Time (hh:mm:ss)	Level	Lifetime AP	Current AP	Unique Portals Visited	Unique Portals Drone Visited	Furthest Drone Distance	Portals Discovered	Seer Points	XM Collected	OPR Agreements	Portal Scans Uploaded	Uniques Scout Controlled	Resonators Deployed	Links Created	Control Fields Created	Mind Units Captured	Longest Link Ever Created	Largest Control Field	XM Recharged	Portals Captured	Unique Portals Captured	Mods Deployed	Hacks	Drone Hacks	Glyph Hack Points	Overclock Hack Points	Completed Hackstreaks	Longest Sojourner Streak	Resonators Destroyed	Portals Neutralized	Enemy Links Destroyed	Enemy Fields Destroyed	Battle Beacon Combatant	Drones Returned	Machina Links Destroyed	Machina Resonators Destroyed	Machina Portals Neutralized	Machina Portals Reclaimed	Max Time Portal Held	Max Time Link Maintained	Max Link Length x Days	Max Time Field Held	Largest Field MUs x Days	Forced Drone Recalls	Distance Walked	Kinetic Capsules Completed	Unique Missions Completed	Research Bounties Completed	Research Days Completed	NL-1331 Meetup(s) Attended	First Saturday Events	Second Sunday Events	Field Test Dispatch	Erased Memories Global Op Points	Agents Recruited	";

	// Display corrected output
	document.getElementById("output").value = correctedRows.join('\n');
}
