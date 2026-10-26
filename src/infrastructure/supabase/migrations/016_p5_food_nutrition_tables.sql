alter table food_items
  alter column serving_size_grams drop not null,
  alter column calories drop not null,
  alter column protein_grams drop not null,
  alter column carbs_grams drop not null,
  alter column fat_grams drop not null;

alter table food_items
  add column nutrition_data jsonb,
  add column original_image_path text,
  add column available_for_planning boolean not null default true;

update food_items
set nutrition_data = jsonb_build_object(
  'columns', jsonb_build_array(jsonb_build_object(
    'id', 'serving',
    'label', 'Porção',
    'basisAmount', serving_size_grams,
    'basisUnit', case when serving_size_grams is null then null else 'g' end
  )),
  'nutrients', jsonb_build_array(
    jsonb_build_object('id', 'energy', 'label', 'Calorias', 'values', jsonb_build_array(
      jsonb_build_object('columnId', 'serving', 'amount', calories,
        'dailyValuePercent', null,
        'certainty', case when calories is null then 'unknown' else 'confirmed' end,
        'unit', case when calories is null then null else 'kcal' end,
        'origin', 'label')
    )),
    jsonb_build_object('id', 'protein', 'label', 'Proteínas', 'values', jsonb_build_array(
      jsonb_build_object('columnId', 'serving', 'amount', protein_grams,
        'dailyValuePercent', null,
        'certainty', case when protein_grams is null then 'unknown' else 'confirmed' end,
        'unit', case when protein_grams is null then null else 'g' end,
        'origin', 'label')
    )),
    jsonb_build_object('id', 'carbohydrates', 'label', 'Carboidratos', 'values', jsonb_build_array(
      jsonb_build_object('columnId', 'serving', 'amount', carbs_grams,
        'dailyValuePercent', null,
        'certainty', case when carbs_grams is null then 'unknown' else 'confirmed' end,
        'unit', case when carbs_grams is null then null else 'g' end,
        'origin', 'label')
    )),
    jsonb_build_object('id', 'total-fat', 'label', 'Gorduras totais', 'values', jsonb_build_array(
      jsonb_build_object('columnId', 'serving', 'amount', fat_grams,
        'dailyValuePercent', null,
        'certainty', case when fat_grams is null then 'unknown' else 'confirmed' end,
        'unit', case when fat_grams is null then null else 'g' end,
        'origin', 'label')
    ))
  )
)
where nutrition_data is null;

alter table food_items
  alter column nutrition_data set not null,
  alter column nutrition_data set default '{"columns":[],"nutrients":[]}'::jsonb;

insert into storage.buckets (id, name, public)
values ('food-labels', 'food-labels', false)
on conflict (id) do nothing;

create policy "food_labels_owner_select" on storage.objects for select to authenticated
using (bucket_id = 'food-labels' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "food_labels_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'food-labels' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "food_labels_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'food-labels' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'food-labels' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "food_labels_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'food-labels' and (storage.foldername(name))[1] = auth.uid()::text);
