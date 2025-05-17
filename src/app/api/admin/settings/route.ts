if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body. Expected an object of settings.' }, { status: 400, headers });
    }
    
    // Use a transaction for all updates to ensure atomicity
    const updatedSettings = await prisma.$transaction(async (tx) => {
      // Array to collect valid updates
      const updateOperations = [];
      
      for (const [key, value] of Object.entries(body)) {
        // Basic validation: ensure key is string and value is not undefined
        if (typeof key !== 'string' || value === undefined) {
          console.warn(`Skipping invalid setting update: key=${key}, value=${value}`);
          continue; // Skip invalid entries
        }
        
        // Add the upsert operation to our array
        updateOperations.push(
          tx.setting.upsert({
            where: { key },
            update: { value: value as Prisma.JsonValue },
            create: { key, value: value as Prisma.JsonValue },
          })
        );
      }
      
      // Execute all updates in parallel within the transaction
      await Promise.all(updateOperations);
      
      // Fetch the updated settings to return
      return tx.setting.findMany();
    });
    
    // Convert to object format
    const settingsObject = updatedSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsObject, { status: 200, headers });
  } catch (error) {
    captureError(error, 'settings-api');
    console.error("Error updating settings:", error);
    
    // Safer error handling without instanceof
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      return NextResponse.json({ 
        error: `Database error: ${prismaError.message || 'Unknown error'}` 
      }, { status: 500, headers });
    }
    
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500, headers });
  }
}
