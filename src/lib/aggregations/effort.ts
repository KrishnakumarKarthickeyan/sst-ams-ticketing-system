export function computeTeamEstimate(efforts: any[] | null | undefined): number {
  if (!efforts || !Array.isArray(efforts)) return 0;
  return efforts.reduce((sum, row) => {
    const val = row.estimatedHours !== undefined ? row.estimatedHours : (row.estimated_hours !== undefined ? row.estimated_hours : (row.hours !== undefined ? row.hours : 0));
    return sum + (Number(val) || 0);
  }, 0);
}

export function computeTeamActual(efforts: any[] | null | undefined): number {
  if (!efforts || !Array.isArray(efforts)) return 0;
  return efforts.reduce((sum, row) => {
    const val = row.actualHours !== undefined ? row.actualHours : (row.actual_hours !== undefined ? row.actual_hours : (row.hours !== undefined ? row.hours : 0));
    return sum + (Number(val) || 0);
  }, 0);
}
