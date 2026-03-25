const HEADER_ROW = "Time Span\tAgent Name\tAgent Faction\tDate (yyyy-mm-dd)\tTime (hh:mm:ss)\tLevel\tLifetime AP\tCurrent AP\tUnique Portals Visited\tUnique Portals Drone Visited\tFurthest Drone Distance\tPortals Discovered\tSeer Points\tXM Collected\tOPR Agreements\tPortal Scans Uploaded\tUniques Scout Controlled\tResonators Deployed\tLinks Created\tControl Fields Created\tMind Units Captured\tLongest Link Ever Created\tLargest Control Field\tXM Recharged\tPortals Captured\tUnique Portals Captured\tMods Deployed\tHacks\tDrone Hacks\tGlyph Hack Points\tOverclock Hack Points\tCompleted Hackstreaks\tLongest Sojourner Streak\tResonators Destroyed\tPortals Neutralized\tEnemy Links Destroyed\tEnemy Fields Destroyed\tBattle Beacon Combatant\tDrones Returned\tMachina Links Destroyed\tMachina Resonators Destroyed\tMachina Portals Neutralized\tMachina Portals Reclaimed\tMax Time Portal Held\tMax Time Link Maintained\tMax Link Length x Days\tMax Time Field Held\tLargest Field MUs x Days\tForced Drone Recalls\tDistance Walked\tKinetic Capsules Completed\tUnique Missions Completed\tResearch Bounties Completed\tResearch Days Completed\tNL-1331 Meetup(s) Attended\tFirst Saturday Events\tSecond Sunday Events\tField Test Dispatch\tErased Memories Global Op Points\tAgents Recruited\t";

function fixTSV() {
    const input = document.getElementById("input").value.trim();
    const rows = input.split("\n");

    const correctedRows = rows.map((row) => {
        const match = row.match(/^(\S+ \S+)(.*)$/);

        if (!match) {
            return row;
        }

        const firstCell = match[1];
        const remainingData = match[2].trim().replace(/ +/g, "\t");

        return `${firstCell}\t${remainingData}`;
    });

    correctedRows[0] = HEADER_ROW;
    document.getElementById("output").value = correctedRows.join("\n");
}

document.getElementById("fixButton").addEventListener("click", fixTSV);
