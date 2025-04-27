import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDepartments, getOrganization, getSettings, updateSettings } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to access admin settings
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Get admin data
    const departments = await getDepartments();
    const organization = await getOrganization();
    const settings = await getSettings();
    
    return NextResponse.json({
      departments,
      organization,
      settings
    });
  } catch (error) {
    console.error('Error getting admin data:', error);
    return NextResponse.json(
      { error: 'Failed to get admin data' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to update settings
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Update settings
    const updatedSettings = await updateSettings(settings);
    
    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
