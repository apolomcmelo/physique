import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Colors, FontFamily, Radius, Spacing, Typography } from '../theme';
import { SECONDARY_NAV_LINKS } from './tabConfig';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export const SIDE_NAV_WIDTH = 256;

export function SideNav({ state, descriptors, navigation }: TabBarProps) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.brand}>
                <View style={styles.brandIcon}>
                    <MaterialIcons name="fitness-center" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.brandText}>PHYSIQUE</Text>
            </View>

            <View accessibilityRole="tablist" style={styles.section}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const title = options.title ?? route.name;
                    const focused = state.index === index;
                    const color = focused ? Colors.primary : Colors.textSecondary;

                    function handlePress() {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                    }

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="tab"
                            accessibilityLabel={title}
                            accessibilityState={{ selected: focused }}
                            onPress={handlePress}
                            style={({ pressed }) => [
                                styles.item,
                                focused ? styles.itemActive : pressed && styles.itemPressed,
                            ]}
                        >
                            {options.tabBarIcon?.({ focused, color, size: 20 })}
                            <Text style={[styles.itemLabel, { color }, focused && styles.itemLabelActive]}>{title}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={[styles.section, styles.secondarySection]}>
                {SECONDARY_NAV_LINKS.map((link) => (
                    <Pressable
                        key={link.href}
                        accessibilityRole="link"
                        accessibilityLabel={link.title}
                        onPress={() => router.push(link.href)}
                        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                    >
                        <MaterialIcons name={link.icon} size={20} color={Colors.textSecondary} />
                        <Text style={[styles.itemLabel, { color: Colors.textSecondary }]}>{link.title}</Text>
                    </Pressable>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SIDE_NAV_WIDTH,
        flexGrow: 0,
        backgroundColor: Colors.surfaceLowest,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
    },
    content: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    brandIcon: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandText: {
        ...Typography.h2,
        color: Colors.primary,
        letterSpacing: -0.5,
    },
    section: {
        gap: Spacing.xs,
    },
    secondarySection: {
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        borderLeftWidth: 2,
        borderLeftColor: Colors.transparent,
    },
    itemActive: {
        backgroundColor: Colors.surfaceElevated,
        borderLeftColor: Colors.primary,
    },
    itemPressed: {
        backgroundColor: Colors.surfaceContainer,
    },
    itemLabel: {
        ...Typography.body,
        fontFamily: FontFamily.medium,
        fontWeight: '500',
    },
    itemLabelActive: {
        fontFamily: FontFamily.semiBold,
        fontWeight: '600',
    },
});
