   "combinationLogic" = ${validatedData.combinationLogic},
          "enableGrouping" = ${validatedData.enableGrouping},
          "activityRequirements" = ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
          "updatedAt" = NOW()
        WHERE "id" = ${existingSettings.id}
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      if (Array.isArray(settings)) {
        settings = settings[0];
      }
      
      // Add the frontend fields back
      settings = {
        ...settings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      };
    } else {
      // Use raw SQL without specifying fields that might not exist in schema
      settings = await prisma.$queryRaw`
        INSERT INTO "AnonymitySettings" (
          "minGroupSize",
          "minActiveUsers",
          "activityThresholdDays",
          "combinationLogic",
          "enableGrouping",
          "activityRequirements",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${validatedData.minGroupSize},
          ${validatedData.minActiveUsers},
          ${validatedData.activityThresholdDays},
          ${validatedData.combinationLogic},
          ${validatedData.enableGrouping},
          ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
          NOW(),
          NOW()
        )
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      if (Array.isArray(settings)) {
        settings = settings[0];
      }
      
      // Add the frontend fields
      settings = {
        ...settings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      };
    }

    return NextResponse.json(formatAnonymitySettingsResponse(settings));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating anonymity settings:", error);
    return NextResponse.json(
      { error: "Failed to update anonymity settings." },
      { status: 500 }
    );
  }
}
