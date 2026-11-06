import type { ApiWorkoutDay } from "@/lib/api-client";
import type { Exercise } from "@/lib/domain";
export function StudentPreview({
  day,
  exercises,
}: {
  day?: ApiWorkoutDay;
  exercises: Exercise[];
}) {
  return (
    <section className="student-preview card" aria-label="Prévia do aluno">
      <p className="preview-brand">Bota o Shape!</p>
      <h2>{day?.name ?? "Seu treino"}</h2>
      <p className="muted">Prévia do app do aluno</p>
      {!day?.exercises.length && (
        <p>Adicione um exercício para visualizar a ficha.</p>
      )}
      {day?.exercises.map((item, index) => {
        const exercise = exercises.find((e) => e.id === item.exercise);
        return (
          <article className="list-card" key={index}>
            <h3>
              {exercise?.name ?? item.exercise_name ?? "Exercício indisponível"}
            </h3>
            <p className="muted">
              {exercise?.primaryMuscle || "Músculos não informados"}
            </p>
            <div className="coach-observation">
              <strong>Orientação do professor</strong>
              <p>
                {item.coach_observation || "Nenhuma observação específica."}
              </p>
            </div>
            <ol className="preview-sets">
              {item.sets.map((set, i) => (
                <li key={i}>
                  Série {i + 1}: {set.repetitions_min ?? "—"}
                  {set.repetitions_max !== null
                    ? `–${set.repetitions_max}`
                    : ""}{" "}
                  rep.{set.load_kg !== null && ` · ${set.load_kg} kg`}
                  {set.duration_seconds !== null &&
                    ` · ${set.duration_seconds} s`}
                  {set.distance_meters !== null &&
                    ` · ${set.distance_meters} m`}{" "}
                  · descanso {set.rest_seconds ?? "—"} s
                  {set.rpe !== null && ` · RPE ${set.rpe}`}
                  {set.rir !== null && ` · RIR ${set.rir}`}
                  {set.cadence && ` · cadência ${set.cadence}`}
                  {set.note && <p>{set.note}</p>}
                </li>
              ))}
            </ol>
            <details>
              <summary>Instruções da biblioteca</summary>
              <p>{exercise?.preparation}</p>
              {exercise?.instructions.map((step, i) => (
                <p key={i}>{step}</p>
              ))}
              <p>{exercise?.breathing}</p>
            </details>
            <label className="field personal-note">
              Minha anotação
              <textarea
                disabled
                placeholder="Apenas o aluno preenche durante a execução."
              />
            </label>
          </article>
        );
      })}
    </section>
  );
}
