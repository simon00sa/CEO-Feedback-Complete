export async function POST(request: Request) {
  // Option 1: Type assertion
  const { email } = (await request.json()) as { email: string };

  // Option 2: Type-safe with interface
  // interface InvitationRequest { email: string }
  // const { email } = (await request.json()) as InvitationRequest;

  if (!await isUserAdmin("someUserId")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const invitation = await prisma.invitation.create({ data: { email } });
  return NextResponse.json(invitation);
}
