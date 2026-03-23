import { NextResponse } from 'next/server';

export async function GET() {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  return NextResponse.json(users);
}
