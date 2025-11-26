<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Face;
use App\Models\Employee;
use Illuminate\Http\Request;

class FaceController extends Controller
{
    public function enroll(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id',
            'descriptors' => 'required|array',
            'descriptors.*' => 'array',
            'metadata' => 'nullable|array',
        ]);

        $employee = Employee::where('employee_id', $request->employee_id)->first();

        // Compute prototype (average of descriptors)
        $descriptors = $request->descriptors;
        $prototype = $this->computePrototype($descriptors);

        // Check if face already enrolled - update if exists, create if not
        $existingFace = Face::where('employee_id', $employee->id)->first();
        if ($existingFace) {
            $existingFace->update([
                'descriptors' => $descriptors,
                'prototype' => $prototype
            ]);
            $face = $existingFace;
            $message = 'Face re-enrolled successfully';
        } else {
            $face = Face::create([
                'employee_id' => $employee->id,
                'descriptors' => $descriptors,
                'prototype' => $prototype
            ]);
            $message = 'Face enrolled successfully';
        }

        // Update employee face_enrolled status
        $employee->update(['face_enrolled' => true]);

        return response()->json([
            'message' => $message,
            'face' => $face
        ], 201);
    }

public function recognize(Request $request)
    {
        $request->validate([
            'descriptor' => 'required|array',
            'threshold' => 'numeric|min:0|max:2'
        ]);

        $descriptor = $request->descriptor;
        $threshold = $request->threshold ?? 0.4;

        $faces = Face::with('employee')->get();

        $bestMatch = null;
        $bestDistance = PHP_FLOAT_MAX;

        foreach ($faces as $face) {
            // Compare against all stored descriptors for this face
            foreach ($face->descriptors as $storedDescriptor) {
                $distance = $this->euclideanDistance($descriptor, $storedDescriptor);

                // Logging each comparison for debug
                \Log::info("Comparing with face for employee ID {$face->employee_id}, distance: {$distance}");

                if ($distance < $bestDistance) {
                    $bestDistance = $distance;
                    $bestMatch = $face;
                }
            }
        }

        if ($bestMatch) {
            // Removed approximate logic, only check for threshold for match or no match

            \Log::info("Best match employee ID: {$bestMatch->employee_id}, distance: {$bestDistance}, threshold: {$threshold}, face enrolled: " . ($bestMatch->employee->face_enrolled ? 'true' : 'false'));

            // Only proceed if distance is less than or equal to threshold
            if ($bestDistance <= $threshold && $bestMatch->employee->face_enrolled) {
                return response()->json([
                    'match' => true,
                    'employee_id' => $bestMatch->employee->employee_id,
                    'employee_name' => $bestMatch->employee->name,
                    'distance' => $bestDistance
                ]);
            } else {
                // Not matched or face not enrolled
                return response()->json([
                    'match' => false,
                    'distance' => $bestDistance
                ]);
            }
        }

        return response()->json([
            'match' => false,
            'distance' => $bestDistance
        ]);
    }

    public function unenroll(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id'
        ]);

        $employee = Employee::where('employee_id', $request->employee_id)->first();
        $face = Face::where('employee_id', $employee->id)->first();

        if (!$face) {
            return response()->json(['error' => 'Face not enrolled for this employee'], 404);
        }

        $face->delete();
        $employee->update(['face_enrolled' => false]);

        return response()->json(['message' => 'Face unenrolled successfully']);
    }

    private function computePrototype($descriptors)
    {
        if (empty($descriptors)) return [];

        $length = count($descriptors[0]);
        $sum = array_fill(0, $length, 0);

        foreach ($descriptors as $desc) {
            for ($i = 0; $i < $length; $i++) {
                $sum[$i] += $desc[$i];
            }
        }

        return array_map(function($s) use ($descriptors) {
            return $s / count($descriptors);
        }, $sum);
    }

    private function euclideanDistance($a, $b)
    {
        $sum = 0;
        for ($i = 0; $i < count($a); $i++) {
            $diff = $a[$i] - $b[$i];
            $sum += $diff * $diff;
        }
        return sqrt($sum);
    }
}
